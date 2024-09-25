import React, { useState, useEffect } from 'react';

import Success from './Success/Success';

export const Form = ({ onUserAdded }) => {
	// State hooks for managing form data, errors, focus states, submission state, positions, and token
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		phone: '',
		position_id: '',
		photo: null,
	});

	// State for form validation errors
	const [errors, setErrors] = useState({});
	const [focused, setFocused] = useState({
		// State for tracking focus state of form inputs
		name: false,
		email: false,
		phone: false,
		photo: false,
	});
	const [submitting, setSubmitting] = useState(false); // State for submission loading state
	const [positions, setPositions] = useState([]); // State for storing available positions
	const [token, setToken] = useState('');
	const [success, setSuccess] = useState(false);

	useEffect(() => {
		// Fetch API token when component mounts
		fetchToken();
		// Fetch available positions when component mounts
		fetchPositions();
	}, []);

	// Function to fetch available positions from the API
	const fetchPositions = async () => {
		try {
			const response = await fetch(
				'https://frontend-test-assignment-api.abz.agency/api/v1/positions'
			);
			const data = await response.json();

			if (response.ok && data.success) {
				setPositions(data.positions);
			} else {
				// Throw error if fetching positions fails
				throw new Error('Failed to fetch positions.');
			}
		} catch (error) {
			// Log error to console
			console.error('An error occurred while fetching positions:', error.message);
		}
	};

	// Function to fetch a new API token
	const fetchToken = async () => {
		try {
			const response = await fetch(
				'https://frontend-test-assignment-api.abz.agency/api/v1/token'
			);
			const data = await response.json();

			if (response.ok && data.success) {
				setToken(data.token);
			} else {
				// Throw error if fetching token fails
				throw new Error('Failed to fetch token.');
			}
		} catch (error) {
			// Log error to console
			console.error('An error occurred while fetching token:', error.message);
		}
	};

	// Function to handle form submission
	const handleSubmit = async (event) => {
		event.preventDefault();
		const validationErrors = validateForm(formData);
		setErrors(validationErrors);

		if (Object.keys(validationErrors).length === 0) {
			setSubmitting(true);
			try {
				const formDataToSend = new FormData();
				Object.keys(formData).forEach((key) => {
					formDataToSend.append(key, formData[key]);
				});

				const response = await fetch(
					'https://frontend-test-assignment-api.abz.agency/api/v1/users',
					{
						method: 'POST',
						headers: { Token: token },
						body: formDataToSend,
					}
				);

				const data = await response.json();
				if (response.ok && data.success) {
					const { user } = data;
					if (
						user &&
						user.id &&
						user.name &&
						user.email &&
						user.phone &&
						user.position_id &&
						user.photo
					) {
						onUserAdded(user);
						setFormData({
							name: '',
							email: '',
							phone: '',
							position_id: '',
							photo: null,
						});
						setErrors({});
						setSuccess(true);
						setTimeout(() => {
							window.location.reload(); // Reload the page on success
						}, 3000);
					} else {
						setErrors({});
						setSuccess(true);
						setTimeout(() => {
							window.location.reload(); // Reload the page on success
						}, 3000);
					}
				} else {
					handleApiErrors(response, data);
				}
			} catch (error) {
				console.error('An error occurred while submitting the form:', error.message);
				setErrors({ form: 'An error occurred while submitting the form.' });
			} finally {
				setSubmitting(false);
			}
		}
	};

	const handleApiErrors = (response, data) => {
		if (data.fails) {
			const apiErrors = Object.values(data.fails).flat().join(', ');
			setErrors({ form: `${apiErrors} (Error code: ${response.status})` });
		} else if (response.status === 409) {
			setErrors({ form: 'A user with the same email or phone number already exists.' });
		} else {
			setErrors({ form: `${data.message} (Error code: ${response.status})` });
		}
	};

	// Function to handle input field changes
	const handleChange = (event) => {
		const { name, value, type, files } = event.target;
		const updatedValue = type === 'file' ? files[0] : value;

		setFormData((prevData) => ({
			...prevData,
			[name]: updatedValue,
		}));

		setErrors((prevErrors) => ({
			...prevErrors,
			[name]: validateField(name, updatedValue),
		}));
	};

	// Function to handle radio input changes
	const handleRadioChange = (event) => {
		const { value } = event.target;

		setFormData((prevData) => ({
			...prevData,
			position_id: value,
		}));
	};

	// Function to handle input focus
	const handleFocus = (event) => {
		const { name } = event.target;

		setFocused((prevFocused) => ({
			...prevFocused,
			// Update focus state to true for the specific input
			[name]: true,
		}));
	};

	// Function to handle input blur
	const handleBlur = (event) => {
		const { name } = event.target;

		setFocused((prevFocused) => ({
			...prevFocused,
			// Update focus state to false for the specific input
			[name]: false,
		}));
	};

	// Function to validate individual form field
	const validateField = (fieldName, value) => {
		let errorMessage = '';

		switch (fieldName) {
			// name - user name, should be 2-60 characters
			case 'name':
				if (!value.trim()) {
					errorMessage = 'Name is required.';
				} else if (value.length < 2 || value.length > 60) {
					errorMessage = 'Name should be between 2 and 60 characters.';
				}
				break;

			// email - user email, must be a valid email according to RFC2822
			case 'email':
				if (!value.match(/^([^\s@]+@[^\s@]+\.[^\s@]+)$/)) {
					errorMessage = 'Invalid email format.';
				}
				break;

			// phone - user phone number, should start with code of Ukraine +380
			case 'phone':
				if (!value) {
					errorMessage = 'Phone number is required.';
				} else if (!/^\+380\d{9}$/.test(value)) {
					errorMessage =
						'Phone number must start with +380 and contain 9 digits after.';
				}
				break;

			// photo - user photo should be jpg/jpeg image, with resolution at least 70x70px and size must not exceed 5MB.
			case 'photo':
				if (value) {
					const fileType = value.type;
					const fileSize = value.size;

					if (!['image/jpeg', 'image/jpg'].includes(fileType)) {
						errorMessage = 'Photo must be a JPG or JPEG image.';
					} else if (fileSize > 5 * 1024 * 1024) {
						errorMessage = 'File size must not exceed 5MB.';
					} else {
						const image = new Image();
						image.src = URL.createObjectURL(value);
						image.onload = () => {
							if (image.width < 70 || image.height < 70) {
								setErrors((prevErrors) => ({
									...prevErrors,
									photo: 'Image dimensions must be at least 70x70 pixels.',
								}));
							}
						};
					}
				}
				break;

			default:
				break;
		}

		// Return validation error message
		return errorMessage;
	};

	// Function to validate entire form data
	const validateForm = (formData) => {
		const validationErrors = {};

		for (const field in formData) {
			// Validate each field in form data
			const error = validateField(field, formData[field]);

			if (error) {
				// Set validation error for each field
				validationErrors[field] = error;
			}
		}

		// Return all validation errors
		return validationErrors;
	};

	// Function to get class name for input label based on focus or input value
	const getLabelClassName = (fieldName) => {
		// Determine label class based on input focus or value
		return focused[fieldName] || formData[fieldName] ? 'focused' : '';
	};

	const isFormValid = () => {
		return (
			formData.name.trim().length >= 2 &&
			formData.name.trim().length <= 60 &&
			formData.email.trim().match(/^([^\s@]+@[^\s@]+\.[^\s@]+)$/) &&
			/^\+380\d{9}$/.test(formData.phone.trim()) &&
			formData.position_id &&
			formData.photo &&
			(formData.photo.type === 'image/jpeg' || formData.photo.type === 'image/jpg')
			// && !Object.values(errors).some((error) => error)
		);
	};

	return (
		<>
			<form onSubmit={handleSubmit}>
				<div className='input input--text'>
					<label htmlFor='name' className={getLabelClassName('name')}>
						Your name
					</label>

					<input
						type='text'
						id='name'
						name='name'
						value={formData.name}
						onChange={handleChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						required
						aria-describedby='nameError'
					/>

					{errors.name && (
						<span id='nameError' className='input__error'>
							{errors.name}
						</span>
					)}
				</div>

				<div className='input input--text'>
					<label htmlFor='email' className={getLabelClassName('email')}>
						Email
					</label>

					<input
						type='email'
						id='email'
						name='email'
						value={formData.email}
						onChange={handleChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						required
						aria-describedby='emailError'
					/>

					{errors.email && (
						<span id='emailError' className='input__error'>
							{errors.email}
						</span>
					)}
				</div>

				<div className='input input--text'>
					<label htmlFor='phone' className={getLabelClassName('phone')}>
						Phone
					</label>

					<input
						type='tel'
						id='phone'
						name='phone'
						value={formData.phone}
						onChange={handleChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						required
						aria-describedby='phoneError'
					/>

					{errors.phone ? (
						<span id='phoneError' className='input__error'>
							{errors.phone}
						</span>
					) : (
						<span className='input__help'>+38 (XXX) XXX - XX - XX</span>
					)}
				</div>

				<div className='form-checked'>
					<label>Select your position</label>
					{positions.map((position, index) => (
						<div className='input input--radio' key={index}>
							<input
								type='radio'
								id={`position_${position.id}`}
								name='position_id'
								value={position.id}
								onChange={handleRadioChange}
							/>
							<label htmlFor={`position_${position.id}`}>{position.name}</label>
						</div>
					))}
				</div>

				<div className='input input--file'>
					<label htmlFor='photo' className={getLabelClassName('photo')}>
						<span className='input-file__btn'>Upload</span>
						<span className='input-file__text'>
							{formData.photo ? formData.photo.name : 'Upload your photo'}
						</span>
					</label>

					<input
						type='file'
						id='photo'
						name='photo'
						onChange={handleChange}
						onFocus={handleFocus}
						onBlur={handleBlur}
						accept='.jpg, .jpeg'
					/>

					{errors.photo && (
						<span id='fileError' className='input__error'>
							{errors.photo}
						</span>
					)}
				</div>

				<div className='form-action'>
					<button
						className={`main-btn ${submitting || !isFormValid() ? 'disabled' : ''}`}
						type='submit'
						disabled={submitting || !isFormValid()}
					>
						Sign up
					</button>
				</div>

				{errors.form && <div className='form__error'>{errors.form}</div>}
			</form>

			{success && <Success />}
		</>
	);
};

export default Form;
